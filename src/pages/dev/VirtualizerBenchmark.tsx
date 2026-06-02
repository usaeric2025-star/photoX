import React from 'react';
import { VirtualGrid } from '@/components/virtualizer/VirtualGrid';
import { useUIStore } from '@/store/useUIStore';
import { motion, LayoutGroup } from 'motion/react';

// Isolated benchmark page
export default function VirtualizerBenchmark() {
  const selectedIds = useUIStore(s => s.selectedIds);
  const toggleSelected = useUIStore(s => s.toggleSelected);

  // 1. Grouped Scenario: <100 items (simulating collapsed/grouped cards)
  const groupedItems = Array.from({ length: 80 }).map((_, i) => ({ id: `group-${i}`, type: 'group' }));
  
  // 2. Grid Scenario: 10,000 items (simulating massive grid)
  const gridItems = Array.from({ length: 10000 }).map((_, i) => ({ id: `photo-${i}`, type: 'photo' }));

  return (
    <div className="p-8 space-y-12">
      <section>
        <h2 className="text-2xl font-bold mb-4 text-slate-800">1. Grouped Scenario (80 items)</h2>
        <LayoutGroup>
          <motion.div layout>
             <VirtualGrid
            count={groupedItems.length}
            renderItem={(index) => (
               <div className="p-4 border border-slate-200 rounded-lg bg-white shadow-sm">
                 Group {index}
               </div>
            )}
            containerClassName="grid grid-cols-4 gap-4"
          />
          </motion.div>
        </LayoutGroup>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-slate-800">2. Massive Grid Scenario (10,000 items)</h2>
        <LayoutGroup>
          <motion.div layout>
          <VirtualGrid
            count={gridItems.length}
            renderItem={(index) => (
               <div 
                className="aspect-square bg-slate-100 rounded flex items-center justify-center text-xs text-slate-400 border border-slate-200"
                data-selected={selectedIds.includes(gridItems[index].id)}
                onClick={() => toggleSelected(gridItems[index].id)}
              >
                Photo {index}
              </div>
            )}
            containerClassName="grid grid-cols-10 gap-2"
          />
          </motion.div>
        </LayoutGroup>
      </section>
    </div>
  );
}
