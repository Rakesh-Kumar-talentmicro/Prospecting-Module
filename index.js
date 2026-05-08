import express from 'express';
import messagesRoutes from './src/routes/messagesRoutes.js';
import prospectRoutes from './src/routes/prospectRoutes.js';
import masterRoutes from './src/routes/master.routes.js';
import notesRoutes from "./src/routes/notesRoutes.js"
import dotenv from 'dotenv';
import errorHandler from "./src/middleware/errorHandler.js";
// import { createAllTable } from './src/utils/allDbInstance.js';   // ---> Uncomment it when you want all table structures into your respective SQL Database.
dotenv.config();

const app = express();
app.use(express.json());

// createAllTable();               //  ----> This function will create all tables from models directly into each system 
app.use('/messages', messagesRoutes);
app.use('/prospects', prospectRoutes);
app.use('/masters', masterRoutes);
app.use('/notes',notesRoutes);

app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log('Server is running on port ' + port);
});
