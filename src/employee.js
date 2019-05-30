const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const employeeSchema = new Schema({
    name: String,
    title: String,
    gender: String,
    start_date: {
        type: Date,
        get: date => date.getDate()
    },
    office_phone: String,
    cell_phone: String,
    email: String,
    avatar: String,
    manager: ObjectId,
    direct_report: {
        type: Number,
        default: 0
    }
});

employeeSchema.index({name: "text", title: "text", email: "text", manager: "text"});
employeeSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Employee", employeeSchema);
