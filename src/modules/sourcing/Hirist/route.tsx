import React from 'react'
import { SelectedApplicationsProvider } from "@/modules/screening/hooks/useSelectedApplication";
import HiristScreening from '../../screening/routes/applications';

const HiristRoute = () => {
    return (
        <SelectedApplicationsProvider>
            <HiristScreening />
        </SelectedApplicationsProvider>
    )
}

export default HiristRoute
