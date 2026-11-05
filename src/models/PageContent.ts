import mongoose, { Schema, model, models, type InferSchemaType } from 'mongoose';

const PageContentSchema = new Schema(
  {
    kunci: {
      type: String,
      required: true,
      unique: true,
      index: true,
      enum: ['hero', 'about', 'kontak', 'footer'],
    },
    data: { type: Schema.Types.Mixed, default: {} },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true, versionKey: false },
);

export type PageContentDoc = InferSchemaType<typeof PageContentSchema> & {
  _id: mongoose.Types.ObjectId;
  data: Record<string, unknown>;
};

export const PageContent =
  (models.PageContent as mongoose.Model<PageContentDoc> | undefined) ||
  model<PageContentDoc>('PageContent', PageContentSchema);
