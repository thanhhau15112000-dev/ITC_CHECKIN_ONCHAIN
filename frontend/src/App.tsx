import { type ReactNode, useMemo, useState } from 'react';
import {
	DAppKitProvider,
	useCurrentAccount,
	useCurrentNetwork,
	useCurrentWallet,
} from '@mysten/dapp-kit-react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { Transaction } from '@mysten/sui/transactions';
import {
	BookOpen,
	CheckCircle2,
	GraduationCap,
	KeyRound,
	LayoutDashboard,
	ShieldCheck,
	Sparkles,
	Users,
	Wallet,
} from 'lucide-react';
import dAppKit from './dapp-kit';
import { WalletStatus } from './components/wallet-statuc';
import { Button } from './components/ui/button';
import { useAuthBannerStore } from './stores/auth-banner-store';

export default function App() {
	return (
		<DAppKitProvider dAppKit={dAppKit}>
			<div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(22,163,74,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.12),_transparent_24%),linear-gradient(180deg,_#fffdf7_0%,_#f8fafc_45%,_#eefbf4_100%)]">
				<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
					<header className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between">
						<div className="space-y-3">
							<div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-emerald-700 uppercase">
								<Sparkles className="size-3.5" />
								Điểm danh onchain
							</div>
							<div>
								<h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
									ITC Check-in
								</h1>
								<p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
									Giao diện điểm danh dành cho giảng viên và sinh viên. Phần kỹ thuật blockchain được giữ
									ở phía sau, còn trên màn hình chỉ hiển thị các bước dễ hiểu và gần với quy trình lớp
									học.
								</p>
							</div>
						</div>
						<div className="shrink-0">
							<ConnectButton />
						</div>
					</header>

					<WalletStatus />
					<Dashboard />
				</div>
			</div>
		</DAppKitProvider>
	);
}

type Student = { studentCode: string; fullName: string; present: boolean };
type ResultState = { error?: string; success?: string; loading: boolean };

function Dashboard() {
	const account = useCurrentAccount();
	const network = useCurrentNetwork();
	const wallet = useCurrentWallet();
	const { role, setRole, clearRole, bannerDismissed, dismissBanner, restoreBanner } = useAuthBannerStore();

	const [packageId, setPackageId] = useState(
		'0xdd89da229ae6906fd513cc212c0fda266c8736298a6c5fb2251836257ed43191',
	);
	const [registryId, setRegistryId] = useState('');
	const [adminCapId, setAdminCapId] = useState('');
	const [teacherAddress, setTeacherAddress] = useState('');
	const [classId, setClassId] = useState('1');
	const [className, setClassName] = useState('');
	const [sessionId, setSessionId] = useState('1');
	const [sessionLabel, setSessionLabel] = useState('');
	const [sessionCode, setSessionCode] = useState('');
	const [studentCode, setStudentCode] = useState('');
	const [studentName, setStudentName] = useState('');
	const [status, setStatus] = useState('1');
	const [students, setStudents] = useState<Student[]>([]);
	const [result, setResult] = useState<ResultState>({ loading: false });

	const configError = useMemo(() => {
		if (!/^0x[a-fA-F0-9]+$/.test(packageId.trim())) return 'Mã ứng dụng blockchain chưa đúng định dạng.';
		if (!/^0x[a-fA-F0-9]+$/.test(registryId.trim())) return 'Mã sổ điểm danh chưa đúng định dạng.';
		return '';
	}, [packageId, registryId]);

	const roleCopy =
		role === 'teacher'
			? {
					title: 'Không gian giảng viên',
					description:
						'Thiết lập lớp, mở buổi điểm danh và xác nhận điểm danh cho từng sinh viên.',
			  }
			: {
					title: 'Không gian sinh viên',
					description: 'Nhập mã buổi và tự điểm danh trong vài giây.',
			  };

	const runTx = async (build: (tx: Transaction) => void) => {
		if (!account) return;
		try {
			setResult({ loading: true });
			const signer = (wallet as unknown as { features?: Record<string, unknown> } | null)?.features?.[
				'sui:signAndExecuteTransaction'
			] as
				| {
						signAndExecuteTransaction: (input: {
							account: unknown;
							chain: string;
							transaction: Transaction;
						}) => Promise<{ digest?: string }>;
				  }
				| undefined;

			if (!signer) throw new Error('Ví hiện tại chưa hỗ trợ ký và gửi giao dịch.');

			const tx = new Transaction();
			build(tx);
			const res = await signer.signAndExecuteTransaction({
				account,
				chain: `sui:${network}`,
				transaction: tx,
			});
			setResult({ loading: false, success: res?.digest ?? 'Đã gửi giao dịch thành công.' });
		} catch (error) {
			setResult({ loading: false, error: error instanceof Error ? error.message : String(error) });
		}
	};

	if (!account) {
		return (
			<section className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-center text-slate-600 shadow-sm backdrop-blur">
				<p className="text-lg font-medium text-slate-900">Kết nối ví để bắt đầu điểm danh.</p>
				<p className="mt-2 text-sm">
					Sau khi kết nối, bạn có thể chọn vai trò giảng viên hoặc sinh viên và thao tác ngay trên giao diện.
				</p>
			</section>
		);
	}

	return (
		<div className="grid gap-6">
			<section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-white/90 shadow-[0_20px_60px_rgba(22,163,74,0.09)] backdrop-blur">
				<div className="grid gap-6 p-5 md:grid-cols-[1.15fr_0.85fr] md:p-7">
					<div className="space-y-5">
						<div>
							<p className="text-sm font-medium text-emerald-700">Bắt đầu nhanh</p>
							<h2 className="mt-1 text-2xl font-semibold text-slate-900">Chọn vai trò sử dụng</h2>
							<p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
								Mỗi vai trò chỉ hiển thị đúng phần việc cần làm để giao diện đỡ rối và dễ thao tác hơn.
							</p>
						</div>

						<div className="flex flex-wrap gap-3">
							<RoleButton
								active={role === 'teacher'}
								icon={<GraduationCap className="size-4" />}
								label="Giảng viên"
								onClick={() => setRole('teacher')}
							/>
							<RoleButton
								active={role === 'student'}
								icon={<Users className="size-4" />}
								label="Sinh viên"
								onClick={() => setRole('student')}
							/>
							<Button variant="outline" className="rounded-full px-5" onClick={clearRole}>
								Đặt lại
							</Button>
						</div>

						{!bannerDismissed ? (
							<div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="font-semibold">{roleCopy.title}</p>
										<p className="mt-1 leading-6">{roleCopy.description}</p>
									</div>
									<Button variant="outline" size="sm" className="rounded-full" onClick={dismissBanner}>
										Ẩn
									</Button>
								</div>
							</div>
						) : (
							<Button variant="link" className="w-fit p-0 text-emerald-700" onClick={restoreBanner}>
								Hiện lại hướng dẫn nhanh
							</Button>
						)}
					</div>

					<div className="grid gap-3 rounded-[24px] bg-slate-950 p-5 text-slate-50 shadow-inner">
						<div className="flex items-center gap-3">
							<div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-300">
								<LayoutDashboard className="size-5" />
							</div>
							<div>
								<p className="text-sm text-slate-300">Chế độ hiện tại</p>
								<p className="text-lg font-semibold">{role === 'teacher' ? 'Giảng viên' : 'Sinh viên'}</p>
							</div>
						</div>
						<div className="grid gap-3 sm:grid-cols-2">
							<InfoStat
								icon={<BookOpen className="size-4" />}
								label="Mạng đang dùng"
								value={network}
								invert
							/>
							<InfoStat
								icon={<Wallet className="size-4" />}
								label="Ví đang kết nối"
								value={wallet?.name ?? 'Không rõ'}
								invert
							/>
						</div>
						<p className="text-sm leading-6 text-slate-300">
							Gợi ý: giảng viên nên hoàn tất phần thiết lập ban đầu trước, sau đó mới mở buổi điểm danh cho
							sinh viên dùng mã buổi.
						</p>
					</div>
				</div>
			</section>

			<section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] md:p-7">
				<div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
					<div>
						<p className="text-sm font-medium text-emerald-700">Thiết lập ban đầu</p>
						<h2 className="text-2xl font-semibold text-slate-900">Cấu hình hệ thống điểm danh</h2>
						<p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
							Tôi đã đổi tên các trường kỹ thuật sang cách gọi dễ hiểu hơn. Nếu bạn muốn, có thể ẩn hẳn khu
							vực này khỏi sinh viên ở bước tiếp theo.
						</p>
					</div>
				</div>

				<div className="mt-5 grid gap-4 md:grid-cols-3">
					<Field
						label="Mã ứng dụng blockchain"
						help="Trước đây là Package ID."
						value={packageId}
						onChange={setPackageId}
					/>
					<Field
						label="Mã sổ điểm danh"
						help="Trước đây là Registry ID."
						value={registryId}
						onChange={setRegistryId}
					/>
					<Field
						label="Mã quyền quản trị"
						help="Trước đây là AdminCap ID."
						value={adminCapId}
						onChange={setAdminCapId}
					/>
				</div>

				{configError ? (
					<div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
						{configError}
					</div>
				) : null}

				<div className="mt-5 grid gap-3 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 p-4 md:grid-cols-[1.5fr_auto_auto]">
					<Field
						label="Ví giảng viên"
						placeholder="Nhập địa chỉ ví 0x..."
						value={teacherAddress}
						onChange={setTeacherAddress}
					/>
					<Button
						className="h-11 rounded-xl bg-slate-900 px-5 text-white hover:bg-slate-800"
						onClick={() => runTx((tx) => tx.moveCall({ target: `${packageId}::contract::init_admin` }))}
					>
						<ShieldCheck className="mr-2 size-4" />
						Khởi tạo hệ thống
					</Button>
					<Button
						variant="outline"
						className="h-11 rounded-xl px-5"
						onClick={() =>
							runTx((tx) =>
								tx.moveCall({
									target: `${packageId}::contract::register_teacher`,
									arguments: [tx.object(adminCapId), tx.object(registryId), tx.pure.address(teacherAddress)],
								}),
							)
						}
					>
						<KeyRound className="mr-2 size-4" />
						Cấp quyền giảng viên
					</Button>
				</div>
			</section>

			{role === 'teacher' ? (
				<section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] md:p-7">
					<div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
						<div>
							<p className="text-sm font-medium text-emerald-700">Bảng điều khiển giảng viên</p>
							<h2 className="text-2xl font-semibold text-slate-900">Quản lý lớp và buổi điểm danh</h2>
							<p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
								Mọi thao tác được chia theo trình tự tự nhiên: tạo lớp, thêm danh sách sinh viên, mở buổi,
								rồi điểm danh.
							</p>
						</div>
					</div>

					<div className="mt-5 grid gap-4 lg:grid-cols-2">
						<ActionCard
							title="1. Tạo lớp học"
							description="Đặt tên lớp để bắt đầu quản lý buổi điểm danh."
							icon={<BookOpen className="size-5" />}
						>
							<div className="grid gap-3 md:grid-cols-[140px_1fr_auto]">
								<Field label="Mã lớp" value={classId} onChange={setClassId} />
								<Field label="Tên lớp" value={className} onChange={setClassName} />
								<Button
									className="h-11 rounded-xl bg-emerald-600 px-5 text-white hover:bg-emerald-500"
									onClick={() =>
										runTx((tx) =>
											tx.moveCall({
												target: `${packageId}::contract::create_class`,
												arguments: [tx.object(registryId), tx.pure.string(className)],
											}),
										)
									}
								>
									Tạo lớp
								</Button>
							</div>
						</ActionCard>

						<ActionCard
							title="2. Mở buổi điểm danh"
							description="Tạo mã buổi để sinh viên nhập và tự điểm danh."
							icon={<CheckCircle2 className="size-5" />}
						>
							<div className="grid gap-3 md:grid-cols-[120px_1fr_1fr_auto]">
								<Field label="Mã buổi nội bộ" value={sessionId} onChange={setSessionId} />
								<Field label="Tên buổi" value={sessionLabel} onChange={setSessionLabel} />
								<Field label="Mã buổi cho sinh viên" value={sessionCode} onChange={setSessionCode} />
								<Button
									className="h-11 rounded-xl bg-slate-900 px-5 text-white hover:bg-slate-800"
									onClick={() =>
										runTx((tx) =>
											tx.moveCall({
												target: `${packageId}::contract::open_session`,
												arguments: [
													tx.object(registryId),
													tx.pure.u64(Number(classId)),
													tx.pure.string(sessionLabel),
													tx.pure.string(sessionCode),
													tx.pure.u64(Math.floor(Date.now() / 1000)),
													tx.pure.u64(Math.floor(Date.now() / 1000) + 3600),
												],
											}),
										)
									}
								>
									Mở buổi
								</Button>
							</div>
						</ActionCard>
					</div>

					<div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
						<ActionCard
							title="3. Thêm sinh viên vào lớp"
							description="Nhập nhanh từng sinh viên rồi lưu danh sách lên hệ thống."
							icon={<Users className="size-5" />}
						>
							<div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
								<Field label="Mã sinh viên" value={studentCode} onChange={setStudentCode} />
								<Field label="Họ và tên" value={studentName} onChange={setStudentName} />
								<Button
									variant="outline"
									className="h-11 rounded-xl px-5"
									onClick={() => {
										if (!studentCode.trim() || !studentName.trim()) return;
										setStudents((prev) => [
											...prev,
											{ studentCode: studentCode.trim(), fullName: studentName.trim(), present: false },
										]);
										setStudentCode('');
										setStudentName('');
									}}
								>
									Thêm vào danh sách
								</Button>
								<Button
									className="h-11 rounded-xl bg-emerald-600 px-5 text-white hover:bg-emerald-500"
									onClick={() =>
										runTx((tx) =>
											tx.moveCall({
												target: `${packageId}::contract::add_students`,
												arguments: [
													tx.object(registryId),
													tx.pure.u64(Number(classId)),
													tx.pure.vector('string', students.map((s) => s.studentCode)),
													tx.pure.vector('string', students.map((s) => s.fullName)),
												],
											}),
										)
									}
								>
									Lưu danh sách
								</Button>
							</div>

							<div className="mt-4 grid gap-3">
								{students.length === 0 ? (
									<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
										Chưa có sinh viên nào trong danh sách tạm.
									</div>
								) : (
									students.map((s) => (
										<div
											key={s.studentCode}
											className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 md:flex-row md:items-center md:justify-between"
										>
											<div>
												<p className="font-medium text-slate-900">{s.fullName}</p>
												<p className="text-sm text-slate-500">{s.studentCode}</p>
											</div>
											<div className="flex flex-wrap items-center gap-3">
												<span
													className={
														s.present
															? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700'
															: 'rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700'
													}
												>
													{s.present ? 'Đã điểm danh' : 'Chưa điểm danh'}
												</span>
												<Button
													variant="outline"
													className="rounded-xl"
													onClick={() =>
														runTx((tx) =>
															tx.moveCall({
																target: `${packageId}::contract::teacher_check_in`,
																arguments: [
																	tx.object(registryId),
																	tx.pure.u64(Number(classId)),
																	tx.pure.u64(Number(sessionId)),
																	tx.pure.string(s.studentCode),
																	tx.pure.u8(Number(status)),
																	tx.pure.u64(Math.floor(Date.now() / 1000)),
																],
															}),
														).then(() =>
															setStudents((prev) =>
																prev.map((x) =>
																	x.studentCode === s.studentCode ? { ...x, present: true } : x,
																),
															),
														)
													}
												>
													Điểm danh hộ
												</Button>
											</div>
										</div>
									))
								)}
							</div>
						</ActionCard>

						<ActionCard
							title="4. Trạng thái điểm danh"
							description="Chọn trạng thái dùng khi giảng viên điểm danh thủ công."
							icon={<CheckCircle2 className="size-5" />}
						>
							<label className="grid gap-2 text-sm font-medium text-slate-700">
								Trạng thái
								<select
									className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-emerald-400"
									value={status}
									onChange={(e) => setStatus(e.target.value)}
								>
									<option value="0">Vắng mặt</option>
									<option value="1">Đúng giờ</option>
									<option value="2">Đi trễ</option>
								</select>
							</label>
						</ActionCard>
					</div>
				</section>
			) : (
				<section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] md:p-7">
					<div>
						<p className="text-sm font-medium text-emerald-700">Không gian sinh viên</p>
						<h2 className="text-2xl font-semibold text-slate-900">Tự điểm danh</h2>
						<p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
							Sinh viên chỉ cần nhập mã buổi, mã sinh viên và họ tên. Phần xử lý blockchain được hệ thống
							thực hiện ở phía sau.
						</p>
					</div>

					<div className="mt-5 rounded-[24px] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-orange-50 p-5">
						<div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
							<Field
								label="Mã buổi"
								placeholder="Ví dụ: ITC-2026-01"
								value={sessionCode}
								onChange={setSessionCode}
							/>
							<Field label="Mã sinh viên" value={studentCode} onChange={setStudentCode} />
							<Field label="Họ và tên" value={studentName} onChange={setStudentName} />
							<Button
								className="h-11 rounded-xl bg-slate-900 px-6 text-white hover:bg-slate-800"
								onClick={() =>
									runTx((tx) =>
										tx.moveCall({
											target: `${packageId}::contract::student_check_in_by_code`,
											arguments: [
												tx.object(registryId),
												tx.pure.string(sessionCode),
												tx.pure.string(studentCode),
												tx.pure.string(studentName),
												tx.pure.u64(Math.floor(Date.now() / 1000)),
											],
										}),
									)
								}
							>
								<CheckCircle2 className="mr-2 size-4" />
								Xác nhận điểm danh
							</Button>
						</div>
					</div>
				</section>
			)}

			{result.error ? (
				<div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					{result.error}
				</div>
			) : null}
			{result.success ? (
				<div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
					Mã giao dịch: {result.success}
				</div>
			) : null}
			{result.loading ? (
				<div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
					Đang gửi giao dịch lên mạng blockchain...
				</div>
			) : null}
		</div>
	);
}

function RoleButton({
	active,
	icon,
	label,
	onClick,
}: {
	active: boolean;
	icon: ReactNode;
	label: string;
	onClick: () => void;
}) {
	return (
		<Button
			variant={active ? 'default' : 'outline'}
			className={
				active
					? 'rounded-full bg-emerald-600 px-5 text-white hover:bg-emerald-500'
					: 'rounded-full border-slate-200 px-5 text-slate-700'
			}
			onClick={onClick}
		>
			{icon}
			{label}
		</Button>
	);
}

function Field({
	label,
	help,
	placeholder,
	value,
	onChange,
}: {
	label: string;
	help?: string;
	placeholder?: string;
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<label className="grid gap-2 text-sm font-medium text-slate-700">
			<span>{label}</span>
			<input
				className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
			/>
			{help ? <span className="text-xs font-normal text-slate-500">{help}</span> : null}
		</label>
	);
}

function ActionCard({
	title,
	description,
	icon,
	children,
}: {
	title: string;
	description: string;
	icon: ReactNode;
	children: ReactNode;
}) {
	return (
		<div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
			<div className="mb-4 flex items-start gap-3">
				<div className="rounded-2xl bg-white p-3 text-emerald-700 shadow-sm">{icon}</div>
				<div>
					<h3 className="text-lg font-semibold text-slate-900">{title}</h3>
					<p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
				</div>
			</div>
			{children}
		</div>
	);
}

function InfoStat({
	icon,
	label,
	value,
	invert = false,
}: {
	icon: ReactNode;
	label: string;
	value: string;
	invert?: boolean;
}) {
	return (
		<div
			className={
				invert
					? 'rounded-2xl border border-white/10 bg-white/5 p-4'
					: 'rounded-2xl border border-slate-200 bg-white p-4'
			}
		>
			<div className={invert ? 'mb-2 flex items-center gap-2 text-slate-300' : 'mb-2 flex items-center gap-2 text-slate-500'}>
				{icon}
				<span className="text-xs font-medium uppercase tracking-[0.18em]">{label}</span>
			</div>
			<p className={invert ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-slate-900'}>{value}</p>
		</div>
	);
}
