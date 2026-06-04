package com.the.best.hotel.theBestHotel.service;

import com.the.best.hotel.theBestHotel.model.Client;
import com.the.best.hotel.theBestHotel.repository.ClientRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClientService {

    private final ClientRepository clientRepository;

    public List<Client> findAll() {
        return clientRepository.findAll();
    }

    public Client findById(ObjectId id) {
        return clientRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Client not found"));
    }

    public Client create(Client client) {
        if (clientRepository.existsByCpf(client.getCpf())) {
            throw new RuntimeException("CPF já está em uso");
        }
        if (clientRepository.existsByEmail(client.getEmail())) {
            throw new RuntimeException("Email já está em uso");
        }
        return clientRepository.save(client);
    }

    public Client update(ObjectId id, Client updated) {
        Client existing = findById(id);
        existing.setName(updated.getName());
        existing.setEmail(updated.getEmail());
        existing.setPhone(updated.getPhone());
        existing.setAddress(updated.getAddress());
        return clientRepository.save(existing);
    }

    public void delete(ObjectId id) {
        clientRepository.deleteById(id);
    }
}
