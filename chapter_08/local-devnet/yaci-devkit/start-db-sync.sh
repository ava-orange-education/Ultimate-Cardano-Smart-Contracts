CMD="docker-compose"
if ! command -v docker-compose &> /dev/null
then
    echo "docker-compose not found, let's try 'docker compose'"
    CMD="docker compose"
fi

$CMD -p db-sync -f ./docker-compose-db-sync.yml --env-file env up
