import Login  from "../src/pages/Login/Login.jsx";
import Usuarios from "./pages/Usuarios/Usuarios.jsx";
import { Routes, Route } from "react-router-dom"; 


function App() {
  

  return (
    <>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/usuarios" element={<Usuarios />} />
      </Routes>

    </>
  )
}

export default App
