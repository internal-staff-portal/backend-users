import {
  CoreValues,
  Module,
  ModuleConstructor,
} from "@internal-staff-portal/backend-shared";
import { hash } from "bcrypt";
import { Router } from "express";
import { IShortUser, IUser, UserModel } from "./Models/UserModel";

//export model and interfaces
export { IShortUser, IUser, UserModel } from "./Models/UserModel";

//options for the Wrapper
interface ModuleOptions {}

//the wrapper of the constructor
export default function ModuleWrapper(
  options?: ModuleOptions,
): ModuleConstructor {
  //the constructor
  return function (core: CoreValues): Module {
    //define module path
    const path = "/users";

    //create the router
    const usersRouter = Router();

    //create the socket.io namespace
    const namespace = core.createNamespace(path);

    //test route (will be removed)
    usersRouter.get("/test", (req, res) => {
      res.send("Test from users module!");
    });

    //endpoint for creating new users
    usersRouter.post(
      "/createUser",
      core.auth.validateMiddleware,
      async (req, res) => {
        try {
          //find the issuer from db
          const issuer = <IUser>await UserModel.findById(res.locals.payload.id);

          //check if issuer has permissions
          if (!isPrivileged(issuer, "admin"))
            return core.auth.sendData(res, 403, {
              err: true,
              status: 1,
              data: null,
            });

          //get user from db with provided values (case insensitive)
          const check = await UserModel.findOne({
            $or: [
              { email: { $regex: req.body.email, $options: "i" } },
              { username: { $regex: req.body.username, $options: "i" } },
            ],
          });

          //check if values are alredy used
          if (check)
            return core.auth.sendData(res, 400, {
              err: true,
              status: 2,
              data: null,
            });

          //create new user
          const newUser = await UserModel.create({
            email: req.body.email,
            username: req.body.username,
            hashedPassword: await hash(req.body.password, 10),
          });

          //send new user to client
          return core.auth.sendData(res, 201, {
            err: false,
            status: null,
            data: publicData(newUser),
          });
        } catch (err) {
          //log error
          core.logger("warn", String(err));

          //send error to client
          return core.auth.sendData(res, 500, {
            err: true,
            status: 5,
            data: null,
          });
        }
      },
    );

    //endpoint for deleting a user
    usersRouter.delete(
      "/delete/:id",
      core.auth.validateMiddleware,
      async (req, res) => {
        try {
          //find the issuer from db
          const issuer = <IUser>await UserModel.findById(res.locals.payload.id);

          //check if issuer has permissions
          if (!isPrivileged(issuer, "admin"))
            return core.auth.sendData(res, 403, {
              err: true,
              status: 1,
              data: null,
            });

          //find user and delete user
          const target = <IUser | null>await UserModel.findById(req.params.id);

          //check if a user with this id exists
          if (!target)
            return core.auth.sendData(res, 404, {
              err: true,
              status: 2,
              data: null,
            });

          //check if a user is not owner
          if (target.privileges === "owner")
            return core.auth.sendData(res, 403, {
              err: true,
              status: 3,
              data: null,
            });

          //delete the user
          await UserModel.findByIdAndDelete(target);

          //send id confirmation
          return core.auth.sendData(res, 200, {
            err: false,
            status: 0,
            data: publicData(target),
          });
        } catch (err) {
          //log error
          core.logger("warn", String(err));

          //send error to client
          return core.auth.sendData(res, 500, {
            err: true,
            status: 5,
            data: null,
          });
        }
      },
    );

    //return the actual module
    return {
      name: "users",
      path: path,
      router: usersRouter,
    };
  };
}

//only return public information of a user
export function publicData(user: IUser): IShortUser {
  return {
    _id: user._id,
    email: user.email,
    privileges: user.privileges,
    roles: user.roles,
    username: user.username,
  };
}

//check if a user is privileged for a certain privilege
export function isPrivileged(user: IUser, privilege: IUser["privileges"]) {
  //mapper object for string to number
  let levels = {
    owner: 3,
    admin: 2,
    mod: 1,
    user: 0,
  };

  //return if a user is privileged
  return user && levels[user.privileges] >= levels[privilege];
}
