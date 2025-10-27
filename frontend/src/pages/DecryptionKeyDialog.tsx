// web/src/components/DecryptionKeyDialog.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
	Button,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	TextField,
	IconButton,
	InputAdornment,
	Typography,
} from '@mui/material';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';

interface Props {
	open: boolean;
	onCancel: () => void;
	onSubmit: (key: string) => void;
	title?: string;
	description?: string;
}

export default function DecryptionKeyDialog({
	open,
	onCancel,
	onSubmit,
	title = 'Ключ для дешифровки',
	description = 'Введите ключ. Он нужен только для текущего запуска.',
}: Props) {
	const [value, setValue] = useState('');
	const [show, setShow] = useState(false);
	const [error, setError] = useState<string>('');

	useEffect(() => {
		if (open) {
			setValue('');
			setShow(false);
			setError('');
		}
	}, [open]);

	const canSubmit = useMemo(() => value.trim().length > 0, [value]);

	const handleSubmit = () => {
		const v = value.trim();
		if (!v) {
			setError('Ключ не может быть пустым');
			return;
		}
		onSubmit(v);
	};

	return (
		<Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
			<DialogTitle>{title}</DialogTitle>
			<DialogContent>
				{!!description && (
					<Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
						{description}
					</Typography>
				)}
				<TextField
					fullWidth
					autoFocus
					margin="dense"
					label="Ключ"
					type={show ? 'text' : 'password'}
					value={value}
					onChange={(e) => {
						setValue(e.target.value);
						if (error) setError('');
					}}
					error={Boolean(error)}
					helperText={error || 'Ключ нигде не сохраняется.'}
					slotProps={{
						input: {
							endAdornment: (
								<InputAdornment position="end">
									<IconButton aria-label="toggle visibility" onClick={() => setShow((s) => !s)} edge="end">
										{show ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
									</IconButton>
								</InputAdornment>
							),
							inputProps: { spellCheck: 'false', autoComplete: 'off' },
						},
					}}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && canSubmit) {
							e.preventDefault();
							handleSubmit();
						}
					}}
				/>
			</DialogContent>
			<DialogActions>
				<Button onClick={onCancel} color="inherit">
					Отмена
				</Button>
				<Button onClick={handleSubmit} variant="contained" disabled={!canSubmit}>
					Продолжить
				</Button>
			</DialogActions>
		</Dialog>
	);
}
