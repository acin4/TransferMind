import { LineChart } from 'lucide-react';

export default function Simulation() {
  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <LineChart className="text-blue-600" size={28} />
        <h1 className="text-3xl font-bold text-slate-800">Προσομοίωση Μεταγραφής</h1>
      </div>
      
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center mt-10">
        <h2 className="text-xl font-semibold text-slate-700 mb-2">Σύντομα Κοντά σας</h2>
        <p className="text-slate-500">
          Εδώ θα συγκρίνουμε τον παίκτη με την ομάδα στόχο για να βγάλουμε το "Fit Score".
        </p>
      </div>
    </div>
  );
}