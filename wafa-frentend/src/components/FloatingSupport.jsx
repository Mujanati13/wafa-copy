import { FaWhatsapp, FaInstagram } from 'react-icons/fa';
import { INSTAGRAM_URL, WHATSAPP_URL } from '@/config/socialLinks';

const FloatingSupport = () => (
  <nav
    aria-label="Contact"
    className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-40 flex flex-col gap-3 sm:bottom-6 sm:right-6"
  >
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Instagram"
      title="Instagram"
      className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 text-white shadow-lg ring-2 ring-white/80 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-400 sm:h-14 sm:w-14"
    >
      <FaInstagram className="h-6 w-6" aria-hidden="true" />
    </a>
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      title="WhatsApp"
      className="grid h-12 w-12 place-items-center rounded-full bg-green-600 text-white shadow-lg ring-2 ring-white/80 transition hover:bg-green-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-400 sm:h-14 sm:w-14"
    >
      <FaWhatsapp className="h-7 w-7" aria-hidden="true" />
    </a>
  </nav>
);

export default FloatingSupport;
