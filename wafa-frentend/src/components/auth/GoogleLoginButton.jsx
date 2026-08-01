import { motion } from "framer-motion";
import { FcGoogle } from "react-icons/fc";

const GoogleLoginButton = () => {
  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth route
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  };

  return (
    <motion.button
      onClick={handleGoogleLogin}
      className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-card border-2 border-border rounded-lg hover:bg-accent transition-colors duration-300 shadow-sm hover:shadow-md"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <FcGoogle className="text-2xl" />
      <span className="font-medium text-foreground">
        Continuer avec Google
      </span>
    </motion.button>
  );
};

export default GoogleLoginButton;
