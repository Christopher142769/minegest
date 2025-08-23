// ConsommationCard.js
import React from "react";
import { Card } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const formatNumber = (num) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0 }).format(num);

export default function ConsommationCard({ show, bilanData }) {
  if (!bilanData) return null;

  const restante = Math.max(0, bilanData.restante);
  const data = {
    labels: ["Utilisé", "Restant"],
    datasets: [
      {
        label: "Litres",
        data: [bilanData.totalAppro - restante, restante],
        backgroundColor: ["#ff6384", "#36a2eb"],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
      },
    },
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.5 }}
          className="mb-4"
        >
          <Card className="p-4 shadow-lg rounded-4">
            <h4 className="mb-3">📉 Consommation</h4>
            <div className="row align-items-center">
              <div className="col-md-6 text-center">
                <Doughnut data={data} options={options} />
              </div>
              <div className="col-md-6">
                <p>
                  <strong>Initial :</strong>{" "}
                  {formatNumber(bilanData.totalAppro)} L
                </p>
                <p>
                  <strong>Restant :</strong> {formatNumber(restante)} L
                </p>
                <p>
                  <strong>Utilisé :</strong>{" "}
                  {formatNumber(bilanData.totalAppro - restante)} L
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
// import React from 'react';
// import { Card, Table } from 'react-bootstrap';
// import { motion, AnimatePresence } from 'framer-motion';

// const formatNumber = (n) => (n === undefined || n === null ? '-' : n.toLocaleString());

// const ConsommationCard = ({ show, bilanData }) => {
//   if (!bilanData || !bilanData.bilan || !show) return null;
//   const typeMap = bilanData.bilan.reduce((acc, cur) => {
//     const { machineType, totalLiters } = cur;
//     acc[machineType] = (acc[machineType] || 0) + totalLiters;
//     return acc;
//   }, {});

//   return (
//     <AnimatePresence>
//       {show && (
//         <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4">
//           <Card className="p-4 shadow-lg card-glass">
//             <h4 className="mb-3">🛢️ Consommation par type de machine</h4>
//             <Table hover responsive bordered className="big-table">
//               <thead className="table-dark">
//                 <tr>
//                   <th>Type de machine</th>
//                   <th className="text-end">Litres consommés</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {Object.entries(typeMap).map(([type, liters]) => (
//                   <tr key={type}>
//                     <td>{type}</td>
//                     <td className="text-end">{formatNumber(liters)} L</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </Table>
//           </Card>
//         </motion.div>
//       )}
//     </AnimatePresence>
//   );
// };

// export default ConsommationCard;