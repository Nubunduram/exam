// src/App.js
import React from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProductList from './pages/ProductList';
import Cart from './pages/Cart';
import Order from './pages/Order';
import Login from './pages/Login';
import Register from './pages/Register';
import Admin from './pages/Admin';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import ShippingPayment from './pages/ShippingPayment';

/** Mise en page commune : barre de navigation + contenu de la route courante. */
const MainLayout = () => (
  <>
    <Navbar />
    <main className="p-4">
      <Outlet />
    </main>
  </>
);

/** Page affichée pour une URL inconnue. */
const NotFound = () => <p className="p-8">Page introuvable.</p>;

// Définition des routes. Les étapes de commande et l'administration sont protégées.
const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <ProductList /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'cart', element: <Cart /> },
      {
        path: 'shipping-payment',
        element: (
          <ProtectedRoute>
            <ShippingPayment />
          </ProtectedRoute>
        ),
      },
      {
        path: 'order',
        element: (
          <ProtectedRoute>
            <Order />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <AdminRoute>
            <Admin />
          </AdminRoute>
        ),
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

const App = () => <RouterProvider router={router} />;

export default App;
