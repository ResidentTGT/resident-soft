import React from 'react';
import { Card, CardContent, CardHeader, Divider, Grid, TextField, Typography } from '@mui/material';
import type { Cex, CexApi } from '../../../../src/utils/account/models/cex.type';

type TextFieldProps = React.ComponentProps<typeof TextField>;
interface DebouncedTextFieldProps extends Omit<TextFieldProps, 'value' | 'onChange'> {
	value: string;
	onChange: (val: string) => void;
}

const DebouncedTextField = React.memo(function DebouncedTextField({ value, onChange, ...rest }: DebouncedTextFieldProps) {
	const [local, setLocal] = React.useState(value ?? '');
	const timeoutRef = React.useRef<number | null>(null);

	React.useEffect(() => {
		setLocal(value ?? '');
	}, [value]);

	const commit = React.useCallback(
		(v: string) => {
			onChange(v);
		},
		[onChange],
	);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const v = e.target.value;
		setLocal(v);
		if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
		timeoutRef.current = window.setTimeout(() => commit(v), 250);
	};

	const handleBlur = () => commit(local);

	return (
		<TextField
			{...rest}
			value={local}
			onChange={handleChange}
			onBlur={handleBlur}
			slotProps={{ input: { spellCheck: false, autoComplete: 'off' } }}
		/>
	);
});

interface Props {
	label: string;
	value?: Cex;
	onChange: (next: Cex) => void;
	dense?: boolean;
}

export const CexForm = React.memo(function CexForm({ label, value, onChange, dense = false }: Props) {
	const v: Cex = value ?? {};

	const setRoot =
		<K extends keyof Cex>(key: K) =>
		(val: string) =>
			onChange({ ...(v as Cex), [key]: val } as Cex);

	const setApi =
		<K extends keyof CexApi>(key: K) =>
		(val: string) =>
			onChange({
				...v,
				api: { ...(v.api ?? {}), [key]: val },
			});

	const spacing = dense ? 1 : 2;

	return (
		<Card
			variant="outlined"
			sx={{
				borderRadius: 2,
				overflow: 'hidden',
			}}
		>
			<CardHeader
				title={
					<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
						{label}
					</Typography>
				}
				sx={{ pb: 0.5 }}
			/>

			<CardContent sx={{ pt: 1.5 }}>
				<Grid container spacing={spacing} sx={{ mb: 1 }}>
					<Grid size={{ xs: 12, sm: 6 }}>
						<DebouncedTextField label="Email" fullWidth value={v.email ?? ''} onChange={setRoot('email')} />
					</Grid>
				</Grid>

				<Divider sx={{ my: 1.5 }} />

				<Typography variant="overline" color="text.secondary">
					Депозитные адреса
				</Typography>
				<Grid container spacing={spacing}>
					<Grid size={{ xs: 12, sm: 6 }}>
						<DebouncedTextField
							label="EVM Deposit Address"
							fullWidth
							value={v.evmDepositAddress ?? ''}
							onChange={setRoot('evmDepositAddress')}
						/>
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }}>
						<DebouncedTextField
							label="Starknet Deposit Address"
							fullWidth
							value={v.starknetDepositAddress ?? ''}
							onChange={setRoot('starknetDepositAddress')}
						/>
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }}>
						<DebouncedTextField
							label="Sui Deposit Address"
							fullWidth
							value={v.suiDepositAddress ?? ''}
							onChange={setRoot('suiDepositAddress')}
						/>
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }}>
						<DebouncedTextField
							label="Aptos Deposit Address"
							fullWidth
							value={v.aptosDepositAddress ?? ''}
							onChange={setRoot('aptosDepositAddress')}
						/>
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }}>
						<DebouncedTextField
							label="Solana Deposit Address"
							fullWidth
							value={v.solanaDepositAddress ?? ''}
							onChange={setRoot('solanaDepositAddress')}
						/>
					</Grid>
				</Grid>

				<Divider sx={{ my: 1.5 }} />

				<Typography variant="overline" color="text.secondary">
					API
				</Typography>
				<Grid container spacing={spacing}>
					<Grid size={{ xs: 12, sm: 6 }}>
						<DebouncedTextField label="API Key" fullWidth value={v.api?.apiKey ?? ''} onChange={setApi('apiKey')} />
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }}>
						<DebouncedTextField
							label="Secret Key"
							fullWidth
							value={v.api?.secretKey ?? ''}
							onChange={setApi('secretKey')}
						/>
					</Grid>
					{
						<Grid size={{ xs: 12, sm: 6 }}>
							<DebouncedTextField
								label="Passphrase"
								fullWidth
								value={v.api?.passPhrase ?? ''}
								onChange={setApi('passPhrase')}
							/>
						</Grid>
					}
				</Grid>
			</CardContent>
		</Card>
	);
});
