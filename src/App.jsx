import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login/Login.jsx";
import Usuarios from "./pages/Usuarios/Usuarios.jsx";
import Productos from "./pages/Productos/Productos.jsx";
import Ingredientes from "./pages/Ingredientes/Ingredientes.jsx";
import Categorias from "./pages/Categorias/Categorias.jsx";
import Promociones from "./pages/Promociones/Promociones.jsx";
import Roles from "./pages/Roles/Roles.jsx";
import EncargadoTILayout from "./components/layout/EncargadoTILayout/EncargadoTILayout.jsx";
import AdminLayout from "./components/layout/AdminLayout/AdminLayout.jsx";
import PanelTemporal from "./components/layout/PanelTemporal/PanelTemporal.jsx";

function App() {
    return (
        <Routes>
            <Route path="/caja" element={<PanelTemporal rol="CAJA" items={[{ label: "Caja", disabled: true }]} />} />
            <Route path="/cocina" element={<PanelTemporal rol="COCINA" items={[{ label: "Cocina", disabled: true }]} />} />
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
                <Route path="roles" element={<Roles />} />
            </Route>



            <Route
                path="/administrador"
                element={<AdminLayout />}
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
                <Route
                    path="productos"
                    element={<Productos />}
                />
                <Route path="ingredientes" element={<Ingredientes />} />
                <Route path="categorias" element={<Categorias />} />
                <Route path="promociones" element={<Promociones />} />
                <Route path="roles" element={<Roles />} />
            </Route>
        </Routes>
    );
}

export default App;
