import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login/Login.jsx";
import Usuarios from "./pages/Usuarios/Usuarios.jsx";
import EncargadoTILayout from "./components/layout/EncargadoTILayout/EncargadoTILayout.jsx";

function App() {
    return (
        <Routes>
            <Route
                path="/"
                element={<Login />}
            />

            <Route
                path="/encargado-ti"
                element={<EncargadoTILayout />}
            >
                <Route
                    index
                    element={
                        <Navigate
                            to="usuarios"
                            replace
                        />
                    }
                />

                <Route
                    path="usuarios"
                    element={<Usuarios />}
                />
            </Route>
        </Routes>
    );
}

export default App;