import React from 'react';
import { Grid, TextField } from '@mui/material';

import type { Wallet } from '../../../../src/utils/account/models/wallet.type';

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
	value?: Wallet;
	onChange: (next: Wallet) => void;
}

export const WalletForm = React.memo(function WalletForm({ value, onChange }: Props) {
	const v = (value ?? {}) as any;

	const set = (key: keyof Wallet) => (val: string) => onChange({ ...(value ?? {}), [key]: val } as Wallet);

	return (
		<>
			<Grid container spacing={2}>
				<Grid sx={{ width: '400px' }}>
					<DebouncedTextField fullWidth label="Address" value={v.address ?? ''} onChange={set('address')} />
				</Grid>
				<Grid sx={{ width: '400px' }}>
					<DebouncedTextField fullWidth label="Private Key" value={v.private ?? ''} onChange={set('private')} />
				</Grid>
				<Grid sx={{ width: '400px' }}>
					<DebouncedTextField fullWidth label="Seed Phrase" value={v.seed ?? ''} onChange={set('seed')} />
				</Grid>
			</Grid>
		</>
	);
});
