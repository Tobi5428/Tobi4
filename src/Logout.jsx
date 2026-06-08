import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from './api';

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    logoutUser();
    navigate('/login');
  }, [navigate]);

  return (
    <div>
      <h2>Logging out...</h2>
    </div>
  );
};

export default Logout;
