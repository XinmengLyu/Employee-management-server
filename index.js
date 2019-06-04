const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const uniqid = require('uniqid');
const rimraf = require('rimraf');

const Builder = require('./src/buildDB');
const Employee = require('./src/employee')

const dbUrl = 'mongodb://SimonLyu:lxm574976955@cluster0-shard-00-00-kg7uf.mongodb.net:27017,cluster0-shard-00-01-kg7uf.mongodb.net:27017,cluster0-shard-00-02-kg7uf.mongodb.net:27017/EmployeeManagement?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true'

const csv_path = "./static/marvel-wikia-data.csv"
mongoose.connect(dbUrl, { useNewUrlParser: true })
    .then(() => console.log("Database connected"))
    .catch(err => console.log(err));

const app = express();

//user middleware
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "50mb" }));

app.use('/static', express.static(path.join(__dirname, 'static')));

app.use((req, res, next) => {
    console.log(`A ${req.method} request received at ${new Date()}`);
    next();
});

//basic route
app.get('/', (req, res) => {
    res.json({ message: "Hello to employee management app." });
});

//route to build db
app.get('/build', (req, res) => {
    Builder.build([], path.join(__dirname, csv_path))
        .then(data => Builder.prune(data))
        .then(data => Builder.decorate(data))
        .then(data => Builder.toDocuments(data))
        .then(data => Builder.saveDocuments(data))
        .then(results => {
            res.json({ message: `${results.length} documents are inserted.` });
        })
        .catch(err => res.json(err));
});

app.get('/test', (req, res) => {
    Employee.find(async (err, employees) => {
        for (let employee of employees) {
            const path = employee.avatar.split("//");
            employee.avatar = `http://localhost:8080/static/${path[1]}`
            await employee.save();
        }
        res.send({ message: "update succeed" });
    })
});

app.get('/update', (req, res) => {
    Employee.find(async (err, employees) => {
        if (!err) {
            for (let employee of employees) {
                const id = uniqid();
                fs.mkdirSync(path.join(__dirname, `./static/${id}`));
                if (employee.gender === "Male") {
                    const s = fs.readFileSync(path.join(__dirname, "./static/user_male.svg"));
                    fs.writeFileSync(path.join(__dirname, `./static/${id}/avatar.svg`), s);
                } else {
                    const s = fs.readFileSync(path.join(__dirname, "./static/user_female.svg"));
                    fs.writeFileSync(path.join(__dirname, `./static/${id}/avatar.svg`), s);
                }
                employee.avatar = `http://localhost:8080/static/${id}/avatar.svg`;
                //console.log(employee);
                await employee.save();
            }
            res.send({ message: "update success" });
        } else throw err;
    })
        .catch(err => res.send(err));
});

app.post('/avatar', (req, res) => {
    //console.log("received request from /avatar: ", req);
    res.json({ message: "success" });
});

const router = express.Router();

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json({ limit: "50mb" }));

router.route("/employees?")
    .get((req, res) => {
        const { search, manager, dr, field, sort, page } = req.query;
        const options = {
            sort: {
                [field]: sort
            },
            page: page ? +page : 1,
            populate: {
                path: "manager",
                select: "name",
                options: {
                    retainNullValues: true
                }
            }
        };
        //choose which query to use
        const searchQuery = {
            $or: [
                { name: new RegExp(search, "i") },
                { title: new RegExp(search, "i") },
                { office_phone: new RegExp(search, "i") },
                { cell_phone: new RegExp(search, "i") },
                { email: new RegExp(search, "i") },
            ]
        };
        const managerQuery = {
            _id: manager,
        };
        const drQuery = {
            manager: dr,
        }
        const query = manager ? managerQuery : (dr ? drQuery : searchQuery);

        Employee.paginate(query, options)
            .then(results => {
                res.json(results);
            })
            .catch(err => {
                res.send(err);
            });
    });
router.route("/employees")
    .post((req, res) => {
        //console.log("post method /api/employees: ", req.body.avatar.slice(0, 20), typeof req.body.avatar);
        const { avatar, name, title, gender, office_phone, cell_phone, start_date, email, manager } = req.body;
        //create document
        const employee = new Employee({
            name: name,
            title: title,
            gender: gender,
            start_date: start_date,
            office_phone: office_phone,
            cell_phone: cell_phone,
            email: email,
            manager: manager,
        });

        //extract local image information
        const regex = /^data:image\/\w+\;base64,/ig;
        const extension = avatar.match(/\w+(?=\;)/)[0];
        //console.log("extension: ", extension);
        let base64Data = "";
        if (avatar) {
            base64Data = avatar.replace(regex, "");
        } else if (gender = "Male") {
            base64Data = fs.readFileSync(path.join(__dirname, "./static/user_male.svg"));
        } else {
            base64Data = fs.readFileSync(path.join(__dirname, "./static/user_male.svg"));
        }
        const id = uniqid();
        employee.avatar = `http://localhost:8080/static/${id}/avatar.${extension}`;
        const filename = avatar ? path.join(__dirname, `./static/${id}/avatar.${extension}`) :
            path.join(__dirname, `./static/${id}/avatar.svg`);

        employee.save()
            .then((result) => {
                //console.log("save new employee result: ", result);
                return new Promise((resolve, reject) => {
                    fs.mkdirSync(path.join(__dirname, `./static/${id}`));
                    fs.writeFile(filename, base64Data, (avatar ? "base64" : null), (err) => {
                        if (!err) {
                            resolve();
                        } else {
                            reject(err);
                        }
                    });
                });
            })
            .then(() => {
                //console.log("writefile result: ");
                const { manager } = req.body;
                if (manager) {
                    Employee.findById(manager, (err, result) => {
                        if (!err) {
                            result.direct_report = result.direct_report + 1;
                            result.save((err) => {
                                if (!err) {
                                    res.json({ message: "Add new employee done." });
                                } else res.status(500).json(err);
                            });
                        } else {
                            res.status(500).json(err);
                        }
                    });
                } else {
                    res.json({ message: "Add new employee done." });
                }
            })
            .catch((err) => {
                //console.log(err);
                res.status(500).json(err);
            });
    });

router.route("/employees/:uid")
    .get((req, res) => {
        Employee.findById(req.params.uid).populate(
            {
                path: "manager",
                select: "name",
                options: {
                    retainNullValues: true
                }
            }
        ).exec((err, result) => {
            if (!err) {
                res.json(result);
            } else {
                res.json(err);
            }
        })
    })
    .delete((req, res) => {
        const { uid } = req.params;
        new Promise((resolve, reject) => {
            Employee.findById(uid, async (err, result) => {
                if (err) reject(err);
                else {
                    const manager = result.manager ? (await Employee.findById(result.manager).exec()) : null;
                    let dr = await Employee.find({ manager: result._id }).exec();
                    if (manager) {
                        dr = dr.map(emp => {
                            emp.manager = manager._id;
                            return emp;
                        });
                        manager.direct_report = manager.direct_report - 1 + dr.length;
                        await manager.save();
                    } else {
                        dr = dr.map(emp => {
                            emp.manager = undefined;
                            return emp;
                        });
                    }
                    for (let emp of dr) await emp.save();
                    resolve(result);
                }
            });
        })
            .then(result => {
                return new Promise((resolve, reject) => {
                    Employee.findByIdAndDelete(result._id, (err, emp) => {
                        if (!err) {
                            resolve(emp);
                        } else {
                            reject(err);
                        }
                    });
                });
            })
            .then(result => {
                //delete corresponding local files in the server
                const { _id, avatar } = result;
                const id = avatar.match(/(?<=static\/)\w+/)[0];
                return new Promise((resolve, reject) => {
                    rimraf(path.join(__dirname, `./static/${id}`), (err) => {
                        if (!err) resolve(_id);
                        else reject(err);
                    });
                });
            })
            .then(id => res.json({ message: `Employee ${id} is deleted` }))
            .catch(err => res.status(500).json(err));
    })
    .put((req, res) => {
        Employee.findById(req.params.uid).exec((err, result) => {
            return new Promise((resolve, reject) => {
                if (err) reject(err);
                else {
                    resolve({ after: req.body, before: result });
                }
            })
                .then((result) => {
                    //console.log("before update: ", result.before);
                    //console.log("after update: ", result.after);
                    const { before, after } = result;
                    before.name = after.name;
                    before.title = after.title;
                    before.gender = after.gender;
                    before.start_date = after.start_date;
                    before.office_phone = after.office_phone;
                    before.cell_phone = after.cell_phone;
                    before.email = after.email;
                    //update avatar info
                    if (before.avatar !== after.avatar) {
                        //extract local image information
                        const regex = /^data:image\/\w+\;base64,/ig;
                        const extension = after.avatar.match(/\w+(?=\;)/)[0];
                        const base64Data = after.avatar.replace(regex, "");
                        const id = before.avatar.match(/(?<=static\/)\w+/)[0];

                        before.avatar = `http://localhost:8080/static/${id}/avatar.${extension}`;
                        const filename = path.join(__dirname, `./static/${id}/avatar.${extension}`);
                        fs.writeFileSync(filename, base64Data, "base64");
                    }
                    //check manager change
                    return new Promise(async (resolve, reject) => {
                        const mBefore = before.manager;
                        const mAfter = after.manager;
                        if (mBefore) {
                            const m = await Employee.findById(mBefore).exec();
                            m.direct_report = m.direct_report - 1;
                            await m.save();
                        }
                        let tmp = mAfter;
                        if (mAfter) {
                            while (tmp && tmp + "" !== before._id + "") {
                                console.log("first " + tmp + " " + typeof tmp+ " " + before._id + " " + typeof before._id);
                                const m = await Employee.findById(tmp).exec();
                                tmp = m.manager;
                                console.log("second " + tmp + " " + before._id);
                            }
                            if (!tmp) {
                                const m = await Employee.findById(mAfter).exec();
                                m.direct_report = m.direct_report + 1;
                                await m.save();
                                before.manager = mAfter;
                            }
                        } else {
                            before.manager = undefined;
                        }
                        if (!tmp) {
                            resolve(before);
                        } else {
                            resolve({ warning: "Loop detected." });
                        }
                    });
                })
                .then(result => {
                    const { warning } = result;
                    if (warning) res.status(210).json(result);
                    else {
                        result.save((err, saved) => {
                            if (err) {
                                console.log(err);
                                res.status(500).json(err);
                            }
                            else res.json({ message: `Employee ${saved._id} updated` });
                        });
                    }
                })
                .catch(err => {
                    console.log(err);
                    res.status(500).json(err)
                });
        })
    });

router.route("/search?")
    .get((req, res) => {
        const { text } = req.query;
        const query = text ? { name: new RegExp(text, "i") } : {};
        Employee.find(query, (err, result) => {
            if (!err) {
                res.json(result);
            } else {
                res.json(err);
            }
        })
    });

router.route("/test")
    .get((req, res) => {
        Employee.findById(undefined, (err, result) => {
            if (!err) {
                res.json(result);
            } else res.status(500).json(err);
        });
    });

app.use("/api", router);

const port = process.env.PORT || 8080;

app.listen(port, () => console.log("listening port", port));
