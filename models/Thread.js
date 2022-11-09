const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const ThreadSchema = new Schema(
  {
    board: { type: String, required: true },
    replies: [{ 
      _id: { type: ObjectId, ref: "Reply"},
      text: { type: String, required: true },
      delete_password: { type: String, required: true  },
      reported: { type: Boolean },
      created_on: { type: Date, default: Date.now },
    }],
    text: { type: String, required: true },
    delete_password: { type: String, required: true },
    reported: { type: Boolean },
    bumped_on: { type: Date },
    created_on: { type: Date },
  },
  {
    // timestamps: { createdAt: "created_on" },
    versionKey: false
  }
);

ThreadSchema.methods.toJSON = function () {
  var obj = this.toObject();
  delete obj.delete_password;
  delete obj.reported;
  delete obj.board;
  return obj
}

module.exports = mongoose.model("Thread", ThreadSchema);
