import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ErrorAlert = ({ message, onClose }: { message: string, onClose: () => void }) => {
    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                className="fixed top-4 left-4 right-4 z-[9999] bg-red-600 text-white p-4 rounded-2xl shadow-xl border border-red-700 flex justify-between items-center"
            >
                <div>
                     <p className="text-xs font-bold uppercase tracking-widest text-red-200">System Error</p>
                     <p className="text-sm font-bold mt-1">{message}</p>
                </div>
                <button onClick={onClose} className="p-2 bg-red-700 rounded-full"><X size={20} /></button>
            </motion.div>
        </AnimatePresence>
    );
};
