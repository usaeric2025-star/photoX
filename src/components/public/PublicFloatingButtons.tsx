import React from 'react';
import { ArrowUpToLine, MessageCircle } from 'lucide-react';
import { buttonStyles } from '../../styles/buttonStyles';

interface PublicFloatingButtonsProps {
  scrollToTop: () => void;
  contactWhatsApp: () => void;
}

export const PublicFloatingButtons: React.FC<PublicFloatingButtonsProps> = ({ scrollToTop, contactWhatsApp }) => {
  return (
    <div className={buttonStyles.container}>
      <button 
        onClick={scrollToTop} 
        className={`${buttonStyles.button} bg-brand-navy`}
      >
        <ArrowUpToLine size={20} />
      </button>
      <button 
        onClick={contactWhatsApp} 
        className={`${buttonStyles.button} bg-[#25D366]`}
      >
        <MessageCircle size={20} />
      </button>
    </div>
  );
};
