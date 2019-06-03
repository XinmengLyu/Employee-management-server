const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const employeeSchema = new Schema({
    name: {
        type: String,
        trim: true,
    },
    title: {
        type: String,
        trim: true,
    },
    gender: {
        type: String,
        trim: true,
    },
    start_date: {
        type: Date,
        get: date => date.getDate()
    },
    office_phone: {
        type: String,
        trim: true,
    },
    cell_phone: {
        type: String,
        trim: true,
    },
    email: {
        type: String,
        trim: true,
    },
    avatar: {
        type: String,
        trim: true,
    },
    manager: {
        type: ObjectId,
        ref: "Employee",
    },
    direct_report: {
        type: Number,
        default: 0
    }
});

employeeSchema.index({name: "text", title: "text", email: "text", manager: "text"});
employeeSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Employee", employeeSchema);
