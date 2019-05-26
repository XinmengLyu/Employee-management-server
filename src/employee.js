const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const employeeSchema = new Schema({
    name: String,
    title: String,
    gender: String,
    start_date: Date,
    office_phone: String,
    cell_phone: String,
    email: String,
    avatar: String,
    manager: ObjectId,
    direct_report: [ObjectId]
});

module.exports = mongoose.model("Employee", employeeSchema);
