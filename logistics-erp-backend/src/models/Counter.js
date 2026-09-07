import mongoose from "mongoose";

const { Schema } = mongoose;

// Generic auto-increment sequence store, used for LR & GR numbering.
const counterSchema = new Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", counterSchema);

export async function nextSequence(key) {
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}

// Atomically reserves a contiguous block of `count` numbers and returns the
// block's starting number — used to carve out a numbering range for an
// approved LR reservation so later, unrelated LRs (e.g. a temporary/walk-in
// trip) never land inside it.
export async function nextSequenceBlock(key, count) {
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: count } },
    { new: true, upsert: true }
  );
  return doc.seq - count + 1;
}

export default Counter;
