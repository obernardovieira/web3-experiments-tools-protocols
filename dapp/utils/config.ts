const config = {
    particleNetwork: {
        projectId: process.env.NEXT_PUBLIC_PARTICLE_PROJECT_ID!,
        clientKey: process.env.NEXT_PUBLIC_PARTICLE_CLIENT_KEY!,
        appId: process.env.NEXT_PUBLIC_PARTICLE_APP_ID!,
    }
}

export default config;