import React, { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';

/**
 * [AUTO-ANIMATE-UNIFIED] Part 1: Migration Pattern
 * Replacing useAutoAnimate() with Framer Motion layout animations.
 */
export const AnimationPOC = () => {
    const [items, setItems] = useState([1, 2, 3]);

    const addItem = () => setItems([...items, items.length + 1]);
    const removeItem = (id: number) => setItems(items.filter(i => i !== id));

    return (
        <div className="sandbox-wrapper p-4 border-2 border-dashed border-purple-400">
            <h3 className="text-purple-600 font-mono mb-2">Track 2: Motion/React (Unified) POC</h3>
            <div className="flex gap-2 mb-4">
                <button onClick={addItem} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-md text-sm">Add Item</button>
            </div>
            
            <LayoutGroup>
                <div className="grid grid-cols-3 gap-2">
                    <AnimatePresence>
                        {items.map(item => (
                            <motion.div
                                key={item}
                                layout
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ 
                                    type: "spring", 
                                    stiffness: 300, 
                                    damping: 30 
                                }}
                                className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm flex justify-between items-center"
                            >
                                <span>Item {item}</span>
                                <button 
                                    onClick={() => removeItem(item)}
                                    className="text-red-400 hover:text-red-600"
                                >
                                    &times;
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </LayoutGroup>

            <div className="mt-4 p-2 bg-slate-50 rounded text-xs text-slate-500 italic">
                Reasoning: Managed layout transitions are more predictable than auto-animate's DOM mutation observers in React 19 concurrent mode.
            </div>
        </div>
    );
};
