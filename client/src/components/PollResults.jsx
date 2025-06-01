import React from 'react';
import { BarChart } from '@mui/x-charts';

function PollResults({ poll, status }) {
    if (!poll || !poll.options || poll.options.length === 0) {
        return <p className="text-gray-600">No poll data available.</p>;
    }

    const chartData = poll.options.map(opt => opt.votes);
    const chartLabels = poll.options.map(opt => opt.text);

    return (
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h4 className="text-lg font-semibold text-gray-700 mb-2">{poll.question}</h4>
            {BarChart ? ( 
            <BarChart
  width={600}
  height={350}
  layout="horizontal" 
  series={[
    {
      data: chartData,
      id: 'votesId',
      label: 'Votes',
      color: '#6366F1',
    },
  ]}
  yAxis={[
    {
      data: chartLabels,
      scaleType: 'band',
      tickLabelStyle: {
        fontSize: 15,
        textAnchor: 'end',
      },
    },
  ]}
  xAxis={[
    {
      min: 0,
      tickInterval: 1,
      label: 'Votes',
    },
  ]}
  margin={{ top: 20, right: 30, bottom: 30, left: 120 }}
/>
) : (
                <div className="text-center text-gray-500 p-4 border border-red-300 rounded-md bg-red-50">
                    <p className="font-bold">Error: Chart component failed to load. Please ensure `@mui/x-charts` is installed and imported correctly.</p>
                    <p>Displaying raw data:</p>
                    <ul className="list-disc list-inside mt-2">
                        {poll.options.map(opt => (
                            <li key={opt.id}>{opt.text}: {opt.votes} votes</li>
                        ))}
                    </ul>
                </div>
            )}
            <p className="text-sm text-gray-500 mt-2">Status: {status === 'active' ? 'Live' : 'Ended'}</p>
            {poll.correctAnswersCount !== undefined && (
                <p className="text-md text-green-700 font-semibold mt-2">
                    Correct Answers: {poll.correctAnswersCount}
                </p>
            )}
        </div>
    );
}

export default PollResults;
