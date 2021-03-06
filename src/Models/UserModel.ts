import { model, Schema } from "mongoose";
import { v4 } from "uuid";

//a short interface of a user
export interface IShortUser {
  _id: string;
  email: string;
  privileges: "user" | "mod" | "admin" | "owner";
  username: string;
  roles: string[];
}

//the interface for a user
export interface IUser extends IShortUser {
  active: boolean;
  hashedPassword: string;
}

//the user schema
const UserSchema = new Schema<IUser>({
  _id: {
    default: v4,
    type: String,
    required: true,
  },
  active: {
    type: Boolean,
    required: true,
    default: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  hashedPassword: {
    type: String,
    required: true,
  },
  privileges: {
    type: String,
    required: true,
    default: "user",
  },
  username: {
    type: String,
    unique: true,
    required: true,
  },
  roles: {
    type: [String],
    required: true,
    default: [],
  },
});

//the user model
export const UserModel = model("user", UserSchema);
