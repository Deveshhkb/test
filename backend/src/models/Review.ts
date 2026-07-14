import { Schema, model, Document, Types } from 'mongoose';

export interface IReview extends Document {
  user: Types.ObjectId;
  restaurant: Types.ObjectId;
  order: Types.ObjectId;
  rating: number;
  foodRating?: number;
  deliveryRating?: number;
  comment?: string;
  photos: string[];
  reply?: { text: string; at: Date };
  createdAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    foodRating: { type: Number, min: 1, max: 5 },
    deliveryRating: { type: Number, min: 1, max: 5 },
    comment: { type: String, maxlength: 2000 },
    photos: [String],
    reply: { text: String, at: Date },
  },
  { timestamps: true },
);

export const Review = model<IReview>('Review', reviewSchema);
