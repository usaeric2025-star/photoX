import React from 'react';
import { AnimatePresence } from 'motion/react';
import { StaffUnlockDialog } from '../StaffUnlockDialog';
import { WhatsAppChoiceDialog } from '../WhatsAppChoiceDialog';
import { AppSettings, User } from '../../../types';

interface GalleryDialogsProps {
  showPassPrompt: boolean;
  setShowPassPrompt: (show: boolean) => void;
  passInput: string;
  setPassInput: (val: string) => void;
  passError: boolean;
  setPassError: (err: boolean) => void;
  t: any;
  loginWithGoogle?: () => Promise<any>;
  settings?: AppSettings;
  setIsStaffMode: (is: boolean) => void;
  navigate: (path: string) => void;
  showWhatsAppChoice: boolean;
  setShowWhatsAppChoice: (show: boolean) => void;
  openWhatsApp: (num: string) => void;
}

export const GalleryDialogs: React.FC<GalleryDialogsProps> = (props) => {
  return (
    <>
      <AnimatePresence>
        {props.showPassPrompt && (
          <StaffUnlockDialog 
            isOpen={props.showPassPrompt}
            onClose={() => { props.setShowPassPrompt(false); props.setPassInput(''); props.setPassError(false); }}
            passInput={props.passInput}
            setPassInput={props.setPassInput}
            passError={props.passError}
            t={props.t}
            loginWithGoogle={props.loginWithGoogle}
            onSubmit={(e) => {
              e.preventDefault();
              if (props.passInput === props.settings?.access_passcode) {
                props.setIsStaffMode(true);
                props.setShowPassPrompt(false);
                props.setPassInput('');
                props.navigate('/admin');
              } else {
                props.setPassError(true);
              }
            }}
          />
        )}
      </AnimatePresence>

      <WhatsAppChoiceDialog 
        isOpen={props.showWhatsAppChoice}
        onClose={() => props.setShowWhatsAppChoice(false)}
        settings={props.settings}
        t={props.t}
        onSelect={(num) => props.openWhatsApp(num)}
      />
    </>
  );
};
