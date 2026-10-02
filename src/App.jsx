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
import GestionLayout from "./components/layout/GestionLayout.jsx";
import PermissionRoute from "./components/layout/PermissionRoute.jsx";

const protegida = (modulo, pagina) => <PermissionRoute modulo={modulo}>{pagina}</PermissionRoute>;

function App() {
    return (
        <Routes>
            <Route path="/caja" element={<PanelTemporal modulo="pedidos" titulo="caja" />} />
            <Route path="/cocina" element={<PanelTemporal modulo="cocina" titulo="cocina" />} />
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
                            to="/panel"
                            replace
                        />
                    }
                />

                <Route
                    path="usuarios"
                    element={protegida("usuarios", <Usuarios />)}
                />
                <Route path="roles" element={protegida("roles", <Roles />)} />
            </Route>



            <Route
                path="/administrador"
                element={<AdminLayout />}
            >
                <Route
                    index
                    element={
                        <Navigate
                            to="/panel"
                            replace
                        />
                    }
                />

                <Route
                    path="usuarios"
                    element={protegida("usuarios", <Usuarios />)}
                />
                <Route
                    path="productos"
                    element={protegida("productos", <Productos />)}
                />
                <Route path="ingredientes" element={protegida("ingredientes", <Ingredientes />)} />
                <Route path="categorias" element={protegida("categorias", <Categorias />)} />
                <Route path="promociones" element={protegida("combos", <Promociones />)} />
                <Route path="roles" element={protegida("roles", <Roles />)} />
            </Route>
            <Route path="/panel" element={<GestionLayout />}>
                <Route index element={<div aria-label="Panel sin módulos disponibles" />} />
                <Route path="usuarios" element={protegida("usuarios", <Usuarios />)} />
                <Route path="roles" element={protegida("roles", <Roles />)} />
                <Route path="categorias" element={protegida("categorias", <Categorias />)} />
                <Route path="productos" element={protegida("productos", <Productos />)} />
                <Route path="ingredientes" element={protegida("ingredientes", <Ingredientes />)} />
                <Route path="combos" element={protegida("combos", <Promociones />)} />
            </Route>
        </Routes>
    );
}

export default App;
