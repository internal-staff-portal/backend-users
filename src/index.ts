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

    //endpoint for creating new users
    usersRouter.post(
      "/createUser",
      core.auth.validateMiddleware,
      async (req, res) => {
        try {
          //find the issuer from db
          const issuer = await UserModel.findById(res.locals.payload.id);

          //check if issuer exists
          if (!issuer)
            return core.auth.sendData(res, 404, {
              err: true,
              status: 1,
              data: null,
            });

          //check if issuer has permissions
          if (!isPrivileged(issuer, "admin"))
            return core.auth.sendData(res, 403, {
              err: true,
              status: 2,
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
              status: 3,
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

    //endpoint for chaning a users privilege
    usersRouter.put(
      "/changePrivileges",
      core.auth.validateMiddleware,
      async (req, res) => {
        try {
          //find the issuer from db
          const issuer = await UserModel.findById(res.locals.payload.id);

          //check if issuer exists
          if (!issuer)
            return core.auth.sendData(res, 404, {
              err: true,
              status: 1,
              data: null,
            });

          //check that issuer is not changing own privileges
          if (req.body.target === issuer._id)
            return core.auth.sendData(res, 403, {
              err: true,
              status: 2,
              data: null,
            });

          //check if issuer has higher privilege than new privilege
          if (!comparePrivilege(issuer.privileges, req.body.privilege))
            return core.auth.sendData(res, 403, {
              err: true,
              status: 3,
              data: null,
            });

          //get target from database
          const target = await UserModel.findById(req.body.target);

          //send error if targer does not exist
          if (!target)
            return core.auth.sendData(res, 404, {
              err: true,
              status: 4,
              data: null,
            });

          //check that target has lower permissions than issuer
          if (!comparePrivilege(issuer.privileges, target.privileges))
            return core.auth.sendData(res, 403, {
              err: true,
              status: 6,
              data: null,
            });

          //change privilege
          await UserModel.updateOne(
            { _id: target._id },
            {
              $set: { privileges: req.body.privilege },
            },
          );

          //send response
          core.auth.sendData(
            res,
            200,
            publicData(<IUser>await UserModel.findById(target._id)),
          );
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
          const issuer = await UserModel.findById(res.locals.payload.id);

          //check if issuer exists
          if (!issuer)
            return core.auth.sendData(res, 404, {
              err: true,
              status: 1,
              data: null,
            });

          //check if issuer has permissions
          if (!isPrivileged(issuer, "admin"))
            return core.auth.sendData(res, 403, {
              err: true,
              status: 2,
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
let privilege_levels = {
  owner: 3,
  admin: 2,
  mod: 1,
  user: 0,
};

//check if a user is privileged for a certain privilege
export function isPrivileged(user: IUser, privilege: IUser["privileges"]) {
  //return if a user is privileged
  return (
    user && privilege_levels[user.privileges] >= privilege_levels[privilege]
  );
}

//compare 2 privileges
export function comparePrivilege(
  privilege1: IUser["privileges"],
  privilege2: IUser["privileges"],
) {
  //return true if privilege1 is higher than privilege2 else return false
  return privilege_levels[privilege1] > privilege_levels[privilege2];
}
