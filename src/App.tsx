import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import BookNow from './pages/BookNow';
import Orders from './pages/Orders';
import Login from './pages/Login';
import Register from './pages/Register';
import Layout from './components/Layout';
import FloatingChat from './components/FloatingChat';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/product/:slug" element={<ProductDetail />} />
        <Route path="/book-now" element={<BookNow />} />
        <Route path="/orders" element={<Orders />} />
      </Routes>
      <FloatingChat />
    </Layout>
  );
}

export default App;

