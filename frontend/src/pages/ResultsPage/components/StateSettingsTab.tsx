import { Box, Typography, Paper, Stack, Chip, Alert } from '@mui/material';
import type { LaunchParams } from '../../../../../src/utils/types/launchParams.type';

interface StateSettingsTabProps {
	launchParams: LaunchParams | undefined;
	actionFunctionParams: any | undefined;
}

export const StateSettingsTab = ({ launchParams, actionFunctionParams }: StateSettingsTabProps) => {
	if (!launchParams) {
		return (
			<Box sx={{ px: 2, pb: 2 }}>
				<Alert severity="info">Настройки запуска не сохранены</Alert>
			</Box>
		);
	}

	return (
		<Box sx={{ px: 2, pb: 2 }}>
			<Stack spacing={2}>
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Stack direction="row" spacing={1} alignItems="center">
						<Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
							Действие
						</Typography>
						<Chip label={launchParams.ACTION_PARAMS.group} size="small" color="primary" />
						<Typography variant="body2">→</Typography>
						<Chip label={launchParams.ACTION_PARAMS.action} size="small" color="primary" />
					</Stack>
				</Paper>

				{/* Account Settings */}
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Typography variant="subtitle2" color="primary" sx={{ mb: 1.5 }}>
						Настройки аккаунтов
					</Typography>
					<Stack spacing={1}>
						<SettingRow label="Файл аккаунтов" value={launchParams.JOB_ACCOUNTS[0].file} />

						<SettingRow
							label="Аккаунты"
							value={
								launchParams.JOB_ACCOUNTS[0].include.length > 0
									? launchParams.JOB_ACCOUNTS[0].include.join(', ')
									: `${launchParams.JOB_ACCOUNTS[0].start} - ${launchParams.JOB_ACCOUNTS[0].end}`
							}
						/>
						{launchParams.JOB_ACCOUNTS[0].exclude.length > 0 && (
							<SettingRow label="Исключить аккаунты" value={launchParams.JOB_ACCOUNTS[0].exclude.join(', ')} />
						)}
					</Stack>
				</Paper>

				<Paper variant="outlined" sx={{ p: 2 }}>
					<Typography variant="subtitle2" color="primary" sx={{ mb: 1.5 }}>
						Параметры выполнения
					</Typography>
					<Stack spacing={1}>
						<SettingRow label="Количество запусков" value={launchParams.NUMBER_OF_EXECUTIONS} />
						<SettingRow label="Количество потоков" value={launchParams.NUMBER_OF_THREADS} />
						<SettingRow label="Попытки до успеха" value={launchParams.ATTEMPTS_UNTIL_SUCCESS} />
						<SettingRow label="Перемешивать аккаунты" value={launchParams.SHUFFLE_ACCOUNTS ? 'Да' : 'Нет'} />
						<SettingRow label="Использовать прокси" value={launchParams.PROXY ? 'Да' : 'Нет'} />
						<SettingRow label="Ротация прокси" value={launchParams.ROTATE_PROXY ? 'Да' : 'Нет'} />
						<SettingRow label="Учитывать стейт" value={launchParams.TAKE_STATE ? 'Да' : 'Нет'} />
						{launchParams.TAKE_STATE && <SettingRow label="Имя стейта" value={launchParams.STATE_NAME} />}
						<SettingRow
							label="Задержка между аккаунтами (сек)"
							value={`${launchParams.DELAY_BETWEEN_ACCS_IN_S[0]} - ${launchParams.DELAY_BETWEEN_ACCS_IN_S[1]}`}
						/>
						<SettingRow label="Задержка после ошибки (сек)" value={launchParams.DELAY_AFTER_ERROR_IN_S} />
					</Stack>
				</Paper>

				<Paper variant="outlined" sx={{ p: 2 }}>
					<Typography variant="subtitle2" color="primary" sx={{ mb: 1.5 }}>
						Прочие настройки
					</Typography>
					<Stack spacing={1}>
						<SettingRow label="Использовать шифрование" value={launchParams.USE_ENCRYPTION ? 'Да' : 'Нет'} />
						<SettingRow label="Лицензия" value={launchParams.LICENSE} />
					</Stack>
				</Paper>

				<Paper variant="outlined" sx={{ p: 2 }}>
					<Typography variant="subtitle2" color="primary" sx={{ mb: 1.5 }}>
						Параметры действия
					</Typography>
					{actionFunctionParams && Object.keys(actionFunctionParams).length > 0 ? (
						<Box
							component="pre"
							sx={{
								m: 0,
								p: 2,
								backgroundColor: '#1e1e1e',
								color: '#d4d4d4',
								borderRadius: 1,
								overflow: 'auto',
								fontSize: '0.8rem',
								fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace',
								border: '1px solid rgba(255, 255, 255, 0.1)',
								lineHeight: 1.6,
								'& ::selection': {
									backgroundColor: 'rgba(100, 150, 255, 0.3)',
								},
							}}
						>
							{JSON.stringify(actionFunctionParams, null, 2)}
						</Box>
					) : (
						<Typography variant="body2" color="text.secondary">
							Параметры отсутствуют
						</Typography>
					)}
				</Paper>
			</Stack>
		</Box>
	);
};

// Helper component for displaying setting rows
interface SettingRowProps {
	label: string;
	value: string | number | boolean;
}

const SettingRow = ({ label, value }: SettingRowProps) => (
	<Stack direction="row" justifyContent="space-between" alignItems="center">
		<Typography variant="body2" color="text.secondary">
			{label}:
		</Typography>
		<Typography variant="body2" fontWeight="medium">
			{String(value)}
		</Typography>
	</Stack>
);
