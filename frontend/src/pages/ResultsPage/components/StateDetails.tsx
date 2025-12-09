import { Box, Alert, Stack, Typography, Paper } from '@mui/material';
import type { StandardState } from '../../../../../src/utils/state/standardState.interface';
import { parseAccounts, formatAccountNumbers } from '../utils';

interface StateDetailsProps {
	data: StandardState;
}

export const StateDetails = ({ data }: StateDetailsProps) => {
	const { successes, failures } = parseAccounts(data);
	const successCount = successes.length;
	const failCount = failures.length;

	return (
		<Box sx={{ px: 2, pb: 2 }}>
			{data.info && (
				<Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
					{data.info}
				</Alert>
			)}
			<Stack spacing={2}>
				{successCount > 0 && (
					<Box>
						<Typography variant="subtitle2" color="success.main" sx={{ mb: 1 }}>
							Успешно ({successCount})
						</Typography>
						<Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'success.50' }}>
							<Typography variant="body2" sx={{ wordBreak: 'break-word', lineHeight: 1.6 }}>
								{formatAccountNumbers(successes)}
							</Typography>
						</Paper>
					</Box>
				)}
				{failCount > 0 && (
					<Box>
						<Typography variant="subtitle2" color="error.main" sx={{ mb: 1 }}>
							Неудачно ({failCount})
						</Typography>
						<Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'error.50' }}>
							<Typography variant="body2" sx={{ wordBreak: 'break-word', lineHeight: 1.6 }}>
								{formatAccountNumbers(failures)}
							</Typography>
						</Paper>
					</Box>
				)}
				{successCount === 0 && failCount === 0 && (
					<Typography variant="body2" sx={{ opacity: 0.7 }}>
						Нет данных
					</Typography>
				)}
			</Stack>
		</Box>
	);
};
