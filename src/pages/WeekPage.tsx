import { useParams } from "react-router-dom";

export default function WeekPage() {
  const { weekKey } = useParams();
  return (
    <section>
      <h1>本周</h1>
      <p>weekKey: {weekKey ?? "(current)"}</p>
    </section>
  );
}
