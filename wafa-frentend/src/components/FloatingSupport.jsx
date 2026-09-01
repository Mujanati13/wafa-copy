import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaWhatsapp, FaInstagram, FaFacebookF, FaHeadset } from 'react-icons/fa';
import { INSTAGRAM_URL } from '@/config/socialLinks';

const FloatingSupport = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const supportButtons = [
    {
      icon: FaWhatsapp,
      label: 'WhatsApp',
      color: 'bg-green-500 hover:bg-green-600',
      link: 'https://wa.me/212600000000', // Update with actual number
    },
    {
      icon: FaInstagram,
      label: 'Instagram',
      color: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
      link: INSTAGRAM_URL,
    },
    {
      icon: FaFacebookF,
      label: 'Facebook',
      color: 'bg-blue-600 hover:bg-blue-700',
      link: 'https://facebook.com/wafa.medical', // Update with actual page
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Support Options */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: isExpanded ? 1 : 0,
          y: isExpanded ? 0 : 20,
          pointerEvents: isExpanded ? 'auto' : 'none',
        }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-3"
      >
        {supportButtons.map((button, index) => (
          <motion.a
            key={button.label}
            href={button.link}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: 20 }}
            animate={{
              opacity: isExpanded ? 1 : 0,
              x: isExpanded ? 0 : 20,
            }}
            transition={{ duration: 0.2, delay: index * 0.1 }}
            className={`${button.color} text-white rounded-full p-4 shadow-lg transition-all duration-300 flex items-center gap-3 pr-5`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {React.createElement(button.icon, { className: "w-6 h-6" })}
            <span className="font-medium text-sm whitespace-nowrap">
              {button.label}
            </span>
          </motion.a>
        ))}
      </motion.div>

      {/* Main Support Button */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`${
          isExpanded
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
        } text-white rounded-full p-5 shadow-xl transition-all duration-300`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: isExpanded ? 45 : 0 }}
      >
        {isExpanded ? (
          <svg
            className="w-7 h-7"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <FaHeadset className="w-7 h-7" />
        )}
      </motion.button>

      {/* Tooltip when not expanded */}
      {!isExpanded && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap shadow-lg pointer-events-none"
        >
          {t('dashboard:need_help')}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-gray-900"></div>
        </motion.div>
      )}
    </div>
  );
};

export default FloatingSupport;
