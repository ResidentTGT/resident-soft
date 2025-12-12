import { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import type { StandardState } from '../../../../../src/utils/state/standardState.interface';
import type { StateDetailTab } from '../constants';
import { StateSettingsTab } from './StateSettingsTab';
import { StateResultsTab } from './StateResultsTab';
import { StateLogsTab } from './StateLogsTab';

interface StateDetailsProps {
	data: StandardState;
	stateName: string;
}

export const StateDetails = ({ data, stateName }: StateDetailsProps) => {
	const [activeTab, setActiveTab] = useState<StateDetailTab>('results');

	const handleTabChange = (_event: React.SyntheticEvent, newValue: StateDetailTab) => {
		setActiveTab(newValue);
	};

	return (
		<Box>
			<Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
				<Tabs value={activeTab} onChange={handleTabChange} textColor="primary" indicatorColor="primary">
					<Tab label="Результаты" value="results" />
					<Tab label="Настройки" value="settings" />
					<Tab label="Логи" value="logs" />
				</Tabs>
			</Box>

			<Box
				sx={{
					pt: 2,
					maxHeight: '700px',
					overflowY: 'auto',
					overflowX: 'hidden',
				}}
			>
				{activeTab === 'results' && <StateResultsTab data={data} />}
				{activeTab === 'settings' && (
					<StateSettingsTab launchParams={data.launchParams} actionFunctionParams={data.actionFunctionParams} />
				)}
				{activeTab === 'logs' && <StateLogsTab stateName={stateName} isActive={activeTab === 'logs'} />}
			</Box>
		</Box>
	);
};
