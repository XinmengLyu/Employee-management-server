const fs = require("fs");
const csv = require("csv-parser");
const Employee = require("./employee");

const build = (data, path) => {
    return new Promise((resolve, reject) => {
        fs.createReadStream(path)
            .pipe(csv(
                {
                    mapHeaders: ({ header }) => header.toLowerCase().split(" ").join("_"),
                }
            ))
            .on("data", row => data.push(row))
            .on("end", () => {
                data = data.slice(0, 250);
                resolve(data);
            })
            .on("error", err => reject(err));
    });
};

const prune = (data) => {
    return new Promise((resolve, reject) => {
        try {
            data = data.filter((person) => {
                return person.sex && person.first_appearance;
            }).map((person) => {
                const idx = person.name.indexOf("(");
                const name = person.name.slice(0, idx - 1);
                return {
                    name: name,
                    gender: person.sex.split(" ")[0],
                    start_date: new Date(person.first_appearance).toLocaleDateString(),
                }
            });
            //console.log(data[0]);
            resolve(data);
        } catch (err) {
            reject(err);
        }
    });
};

const generatePhone = () => {
    let phone = "";
    //first number
    phone += Math.floor(Math.random() * 9 + 1);
    for (let i = 0; i < 9; i++) {
        phone += Math.floor(Math.random() * 10);
    }
    return phone;
};

const generateEmail = name => {
    return name.toLowerCase().split(" ").join("_") + "@example.com";
}

const decorate = (data) => {
    return new Promise((resolve, reject) => {
        try {
            data = data.map((person) => {
                let phone = generatePhone();
                return {
                    ...person,
                    title: "Junior Software Engineer",
                    office_phone: phone,
                    cell_phone: phone,
                    email: generateEmail(person.name),
                    avatar: ""
                }
            });
            //console.log(data[2]);
            resolve(data);
        } catch (err) {
            reject(err);
        }
    });
};

const toDocuments = (data) => {
    return new Promise((resolve, reject) => {
        try {
            data = data.map(person => {
                const employee = new Employee();
                employee.name = person.name;
                employee.title = person.title;
                employee.gender = person.gender;
                employee.start_date = new Date(person.start_date);
                employee.office_phone = person.office_phone;
                employee.cell_phone = person.cell_phone;
                employee.email = person.email;
                employee.avatar = person.avatar;
                return employee;
            });
            resolve(data);
        } catch (err) {
            reject(err);
        }
    });
};

const saveDocuments = (data) => {
    return new Promise(async (resolve, reject) => {
        const errors = [];
        const results = [];

        for(let doc of data){
            const result = await doc.save();
            //console.log(doc);
            results.push(result);
        }

        if (errors.length === 0) {
            //console.log(results.length);
            resolve(results);
        } else {
            reject(errors);
        }
    });
};

module.exports = {
    build,
    prune,
    decorate,
    toDocuments,
    saveDocuments
}
