const User = require("./User");
const Driver = require("./Driver");
const Vehicle = require("./Vehicle");
const Trip = require("./Trip");
const Maintenance = require("./Maintenance");
const Payment = require("./Payment");

// Relationships in Mongoose are declared directly in each schema via
// `{ type: Schema.Types.ObjectId, ref: "ModelName" }` and resolved at query
// time with `.populate("fieldName")` - there's no separate association step
// like Sequelize needed.

module.exports = { User, Driver, Vehicle, Trip, Maintenance, Payment };
