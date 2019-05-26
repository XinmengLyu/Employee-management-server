const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const Builder = require('./buildDB');
const Employee = require('./employee')

const dbUrl = 'mongodb://SimonLyu:lxm574976955@cluster0-shard-00-00-kg7uf.mongodb.net:27017,cluster0-shard-00-01-kg7uf.mongodb.net:27017,cluster0-shard-00-02-kg7uf.mongodb.net:27017/EmployeeManagement?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true'

const path = "./marvel-wikia-data.csv"
mongoose.connect(dbUrl, {useNewUrlParser: true})
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

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use((req, res, next) => {
    console.log(`A ${req.method} request received at ${new Date()}`);
    next();
});

//basic route
app.get('/', (req, res) => {
    res.json({message: "Hello to employee management app."});
});

//route to build db
app.get('/build', (req, res) => {
    Builder.build([], path)
        .then(data => Builder.prune(data))
        .then(data => Builder.decorate(data))
        .then(data => Builder.toDocuments(data))
        .then(data => Builder.saveDocuments(data))
        .then(results => {
            res.json({message: `${results.length} documents are inserted.`});
        })
        .catch(err => res.json(err));
});

app.get('/test', (req, res) => {
    Employee.find((err, employees) => {
        console.log(employees[0].manager);
        console.log(employees[0].direct_report);
        res.json(employees[0]);
    })
})

const port = process.env.PORT || 8080;

app.listen(port, () => console.log("listening port", port));
