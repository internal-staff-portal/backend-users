import {
  CoreValues,
  Module,
  ModuleConstructor,
} from "@internal-staff-portal/backend-shared";
import { Router } from "express";

//options for the Wrapper
interface ModuleOptions {}

//the wrapper of the constructor
export default function ModuleWrapper(
  options?: ModuleOptions,
): ModuleConstructor {
  //the constructor
  return function (core: CoreValues): Module {
    //define module path
    const path = "/TModule";

    //create the router
    const TModuleRouter = Router();

    //create the socket.io namespace
    const namespace = core.createNamespace(path);

    //the module code here

    //return the actual module
    return {
      name: "TModule",
      path: path,
      router: TModuleRouter,
    };
  };
}
