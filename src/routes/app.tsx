import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { signOut, useSession } from "../lib/auth-client";

export const Route = createFileRoute("/app")({
	component: AppLayout,
});

function AppLayout() {
	const { data: session } = useSession();
	const role = session?.user.role;
	const isStudent = role?.includes("student");
	const isLecturer =
		role?.includes("lecturer") || role?.includes("administrator");

	return (
		<div className="page-wrap py-8">
			<header className="island-shell rounded-2xl px-6 py-4 flex items-center justify-between">
				<Link
					to="/app"
					className="display-title text-xl font-bold no-underline"
				>
					e-exam
				</Link>
				<nav className="flex items-center gap-6 text-sm font-medium">
					{session ? (
						<>
							{isStudent && (
								<Link to="/app" className="nav-link">
									My exams
								</Link>
							)}
							{isLecturer && (
								<>
									<Link to="/app/questions" className="nav-link">
										Question bank
									</Link>
									<Link to="/app/exams" className="nav-link">
										Exams
									</Link>
								</>
							)}
							<span className="text-muted-foreground">
								{session.user.name} ({role?.split(",").join(" / ")})
							</span>
							<button
								type="button"
								className="text-sm font-medium underline underline-offset-2"
								onClick={async () => {
									await signOut();
									window.location.href = "/login";
								}}
							>
								Sign out
							</button>
						</>
					) : (
						<>
							<Link to="/login" className="nav-link">
								Sign in
							</Link>
							<Link to="/register" className="nav-link">
								Register
							</Link>
						</>
					)}
				</nav>
			</header>
			<main className="mt-8">
				<Outlet />
			</main>
		</div>
	);
}
