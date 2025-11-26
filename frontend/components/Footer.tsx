import React from 'react';

interface FooterProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onFinish?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ 
  currentStep, 
  totalSteps, 
  onBack, 
  onNext,
  onFinish 
}) => {
  const isLastStep = currentStep === totalSteps;

  return (
    <footer className="sticky bottom-0 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 px-4 sm:px-6 lg:px-8 py-4 z-20">
      <div className="max-w-4xl mx-auto flex justify-between gap-4">
        <button 
          onClick={onBack}
          className="px-6 py-2 rounded-lg text-sm font-bold bg-slate-200 dark:bg-slate-600 text-neutral-800 dark:text-neutral-100 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
          Quay lại
        </button>
        
        {!isLastStep ? (
          <button 
            onClick={onNext}
            className="px-6 py-2 rounded-lg text-sm font-bold bg-brand-primary text-white hover:bg-opacity-90 transition-colors flex items-center gap-2"
          >
            Tiếp tục
            <span className="material-symbols-outlined text-xl">arrow_forward</span>
          </button>
        ) : (
          <button 
            onClick={onFinish}
            className="px-6 py-2 rounded-lg text-sm font-bold bg-brand-primary text-white hover:bg-opacity-90 transition-colors flex items-center gap-2"
          >
            Hoàn tất 
            <span className="material-symbols-outlined text-xl">check_circle</span>
          </button>
        )}
      </div>
    </footer>
  );
};
