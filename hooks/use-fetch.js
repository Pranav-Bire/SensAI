
import { toast } from "sonner";

const { useState } = require("react");

const useFetch=(cb)=>{
    const [loading, setLoading] = useState(null);
    const [data, setData] = useState(undefined);
    const [error, setError] = useState(null);

    const fn = async (...args) => {

        setLoading(true);
        setError(null);

        try {
           const response = await cb(...args);
           setData(response);
           setError(null);

        } catch (error) {
            setError(error);
            toast.error(error.message);


        } finally {
            setLoading(false);
        }
    };

    return { loading, data, error, fn, setData};
};

export default useFetch