import {
  CoreValues,
  Module,
  ModuleConstructor,
} from "@internal-staff-portal/backend-shared";
import { Router } from "express";

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

    //return the actual module
    return {
      name: "users",
      path: path,
      router: usersRouter,
    };
  };
}
