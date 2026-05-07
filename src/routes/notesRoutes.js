import express from "express";
import * as notesController from "../controller/notesController.js";

const router = express.Router();

router.post("/", notesController.createNote);

router.get("/:prospectId", notesController.listNotes);

export default router;