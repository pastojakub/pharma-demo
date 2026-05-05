import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Offer } from '../../../types';
import { ORDER_STATUS } from '../../../lib/constants';

interface ApproveOfferModalProps {
  offers: Offer[];
  selectedOffer: Offer | null;
  setSelectedOffer: (offer: Offer | null) => void;
}

export const ApproveOfferModal: React.FC<ApproveOfferModalProps> = ({
  offers,
  selectedOffer,
  setSelectedOffer,
}) => {
  return (
    <div className="space-y-6">
      <p className="text-gray-500 font-bold ml-1">Vyberte najvhodnejšiu cenovú ponuku:</p>
      <div className="space-y-4">
        {offers
          .filter((o) => o.status === ORDER_STATUS.PENDING)
          .map((offer) => (
            <button
              key={offer.id}
              onClick={() => setSelectedOffer(offer)}
              className={`w-full p-8 rounded-[2.5rem] border-2 transition-all text-left flex justify-between items-center ${selectedOffer?.id === offer.id ? 'border-black bg-gray-50 shadow-xl shadow-gray-100/50 scale-[1.02]' : 'border-gray-100 bg-white hover:border-gray-200'}`}
            >
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                  Ponuka od {offer.manufacturerOrg}
                </p>
                <p className="text-4xl font-black text-black">{offer.price.toFixed(2)}€</p>
              </div>
              <div className={selectedOffer?.id === offer.id ? 'text-black' : 'text-gray-200'}>
                <CheckCircle size={40} />
              </div>
            </button>
          ))}
      </div>
    </div>
  );
};
