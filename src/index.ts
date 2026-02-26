import express from 'express'
import cors from 'cors';


const app = express();

const PORT = process.env.PORT || 5000;

//Middleware
app.use(cors());
app.use(express.json());

app.get('/api/health', (req,res)=>{
    res.json({status: 'ok', message: 'Anandam API is running'})
});

app.listen(PORT, ()=> {
    console.log(`server is running on http://localhost:${PORT}`);
})