import { type ReactNode } from 'react';
import { useCurrentAccount, useCurrentNetwork, useCurrentWallet } from '@mysten/dapp-kit-react';
import { BadgeCheck, Globe, Wallet } from 'lucide-react';

export function WalletStatus() {
	const account = useCurrentAccount();
	const wallet = useCurrentWallet();
	const network = useCurrentNetwork();

	if (!account) {
		return (
			<div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-5 text-sm text-slate-600 shadow-sm backdrop-blur">
				Chưa kết nối ví. Hãy kết nối ví để bắt đầu thao tác với hệ thống điểm danh.
			</div>
		);
	}

	return (
		<section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur md:p-6">
			<div className="mb-4 flex items-center gap-3">
				<div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
					<BadgeCheck className="size-5" />
				</div>
				<div>
					<p className="text-sm font-medium text-emerald-700">Trạng thái kết nối</p>
					<h2 className="text-xl font-semibold text-slate-900">Ví đã sẵn sàng</h2>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<StatusItem icon={<Wallet className="size-4" />} label="Tên ví" value={wallet?.name ?? 'Không rõ'} />
				<StatusItem icon={<Globe className="size-4" />} label="Mạng" value={network} />
				<StatusItem
					icon={<BadgeCheck className="size-4" />}
					label="Địa chỉ ví"
					value={shortenAddress(account.address)}
					mono
				/>
			</div>
		</section>
	);
}

function StatusItem({
	icon,
	label,
	value,
	mono = false,
}: {
	icon: ReactNode;
	label: string;
	value: string;
	mono?: boolean;
}) {
	return (
		<div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
			<div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
				{icon}
				{label}
			</div>
			<p className={mono ? 'font-mono text-sm text-slate-900 break-all' : 'text-sm font-medium text-slate-900'}>
				{value}
			</p>
		</div>
	);
}

function shortenAddress(address: string) {
	if (address.length <= 18) return address;
	return `${address.slice(0, 10)}...${address.slice(-8)}`;
}
