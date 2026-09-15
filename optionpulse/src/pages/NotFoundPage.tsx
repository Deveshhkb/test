import { Link } from "react-router-dom";
import { Panel } from "../components/common/Panel";
import { StatePanel } from "../components/common/StatePanel";

export function NotFoundPage() {
  return (
    <Panel title="Page not found">
      <StatePanel
        kind="empty"
        title="That screen does not exist"
        message="The link may be out of date."
        action={
          <Link to="/" className="btn btn--primary">
            Back to dashboard
          </Link>
        }
      />
    </Panel>
  );
}
